'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './image-cropper-modal.css';

export interface ImageCropperResult {
  blob: Blob;
  dataUrl: string;
  fileName: string;
}

export interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  imageName?: string;
  slotTitle?: string;
  slotType: 'hero' | 'closing' | 'bride' | 'groom' | 'story' | 'gallery' | 'qris';
  onConfirm: (result: ImageCropperResult) => void;
  onUseOriginal: () => void;
  onCancel: () => void;
}

type AspectRatioOption = {
  label: string;
  ratio: number; // width / height
  description: string;
};

const ASPECT_RATIO_PRESETS: Record<string, AspectRatioOption> = {
  LANDSCAPE_16_9: { label: '16:9 Landscape', ratio: 16 / 9, description: 'Melebar sinematik (Cocok untuk Kisah Cinta & Story Window)' },
  LANDSCAPE_4_3: { label: '4:3 Landscape', ratio: 4 / 3, description: 'Melebar standar' },
  SQUARE_1_1: { label: '1:1 Persegi', ratio: 1 / 1, description: 'Kotak simetris (Cocok untuk Avatar & QRIS)' },
  PORTRAIT_3_4: { label: '3:4 Potret', ratio: 3 / 4, description: 'Potret tegak (Cocok untuk Foto Mempelai Pria/Wanita)' },
  PORTRAIT_9_16: { label: '9:16 Vertikal', ratio: 9 / 16, description: 'Layar HP penuh (Cocok untuk Hero Cover)' },
};

function getDefaultRatioKey(slotType: string): string {
  switch (slotType) {
    case 'story':
      return 'LANDSCAPE_16_9';
    case 'bride':
    case 'groom':
    case 'closing':
      return 'PORTRAIT_3_4';
    case 'hero':
      return 'PORTRAIT_9_16';
    case 'qris':
      return 'SQUARE_1_1';
    default:
      return 'LANDSCAPE_16_9';
  }
}

export function ImageCropperModal({
  isOpen,
  imageSrc,
  imageName = 'foto.jpg',
  slotTitle,
  slotType,
  onConfirm,
  onUseOriginal,
  onCancel,
}: ImageCropperModalProps) {
  const [selectedRatioKey, setSelectedRatioKey] = useState<string>(() => getDefaultRatioKey(slotType));
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{ w: number; h: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Pinch-to-zoom tracking on mobile
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);

  // Reset parameters when a new image or slot is selected
  useEffect(() => {
    if (isOpen) {
      setSelectedRatioKey(getDefaultRatioKey(slotType));
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setIsProcessing(false);

      const img = new Image();
      img.onload = () => {
        setNaturalDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc, slotType]);

  const activeRatioConfig = useMemo(() => {
    return ASPECT_RATIO_PRESETS[selectedRatioKey] || ASPECT_RATIO_PRESETS.LANDSCAPE_16_9;
  }, [selectedRatioKey]);

  // Crop frame dimensions inside viewport
  const frameDimensions = useMemo(() => {
    const maxBoxWidth = 440;
    const maxBoxHeight = 320;
    const targetRatio = activeRatioConfig.ratio;

    let w = maxBoxWidth;
    let h = w / targetRatio;

    if (h > maxBoxHeight) {
      h = maxBoxHeight;
      w = h * targetRatio;
    }

    return { width: Math.round(w), height: Math.round(h) };
  }, [activeRatioConfig]);

  // Handle Drag / Pan with Pointer Events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(3.5, Math.max(1.0, parseFloat((prev + delta).toFixed(2)))));
  };

  // Touch Pinch-to-zoom on mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const ratio = dist / pinchStartDistRef.current;
      const nextZoom = Math.min(3.5, Math.max(1.0, pinchStartZoomRef.current * ratio));
      setZoom(parseFloat(nextZoom.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  // Rotate 90 deg clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset zoom & pan to center
  const handleResetCrop = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Perform Final Canvas Crop
  const handleApplyCrop = useCallback(async () => {
    if (!naturalDimensions) {
      onUseOriginal();
      return;
    }

    try {
      setIsProcessing(true);

      const targetRatio = activeRatioConfig.ratio;
      // Output canvas dimension (sharp HD resolution)
      const baseOutputWidth = targetRatio >= 1 ? 1280 : Math.round(1280 * targetRatio);
      const baseOutputHeight = Math.round(baseOutputWidth / targetRatio);

      const canvas = document.createElement('canvas');
      canvas.width = baseOutputWidth;
      canvas.height = baseOutputHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context tidak tersedia');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Load image instance
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memuat citra untuk pemotongan'));
        img.src = imageSrc;
      });

      // Calculate source image drawing matrix based on frame, zoom, rotation, and pan
      const fw = frameDimensions.width;
      const fh = frameDimensions.height;

      // Base scale: How image is fitted inside the preview frame
      // In CSS object-fit: cover equivalent inside the frame
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const effectiveImgW = isRotated90or270 ? naturalDimensions.h : naturalDimensions.w;
      const effectiveImgH = isRotated90or270 ? naturalDimensions.w : naturalDimensions.h;

      const scaleToCoverFrame = Math.max(fw / effectiveImgW, fh / effectiveImgH);
      const displayScale = scaleToCoverFrame * zoom;

      // Center canvas transformations
      ctx.translate(canvas.width / 2, canvas.height / 2);

      // Map pan from preview pixels to high-res canvas pixels
      const canvasScaleFactor = canvas.width / fw;
      ctx.translate(pan.x * canvasScaleFactor, pan.y * canvasScaleFactor);

      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }

      const drawWidth = naturalDimensions.w * displayScale * canvasScaleFactor;
      const drawHeight = naturalDimensions.h * displayScale * canvasScaleFactor;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

      // Export as Blob and DataURL
      const mimeType = 'image/jpeg';
      const quality = 0.88;

      const dataUrl = canvas.toDataURL(mimeType, quality);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Gagal membuat blob gambar'));
          },
          mimeType,
          quality,
        );
      });

      const cleanFileName = (imageName || 'foto-terpotong.jpg').replace(/\.[^/.]+$/, '') + '-cropped.jpg';

      onConfirm({
        blob,
        dataUrl,
        fileName: cleanFileName,
      });
    } catch (err) {
      console.error('Error saat memotong foto:', err);
      // Fallback: gunakan foto asli jika terjadi kendala pada canvas
      onUseOriginal();
    } finally {
      setIsProcessing(false);
    }
  }, [
    naturalDimensions,
    activeRatioConfig,
    frameDimensions,
    imageSrc,
    imageName,
    zoom,
    pan,
    rotation,
    onConfirm,
    onUseOriginal,
  ]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="irv-crop-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="irv-crop-modal-title"
    >
      <div className="irv-crop-modal" ref={containerRef}>
        {/* Header */}
        <div className="irv-crop-header">
          <div className="irv-crop-header__info">
            <span className="irv-crop-badge">✂️ Atur Posisi & Zoom Foto</span>
            <h3 id="irv-crop-modal-title" className="irv-crop-title">
              {slotTitle || 'Sesuaikan Foto Undangan'}
            </h3>
            <p className="irv-crop-subtitle">
              Geser dengan jari/mouse untuk mengatur wajah & objek. Gunakan slider untuk zoom in/out.
            </p>
          </div>
          <button
            type="button"
            className="irv-crop-close-btn"
            onClick={onCancel}
            aria-label="Tutup pemotong foto"
          >
            ✕
          </button>
        </div>

        {/* Aspect Ratio Presets Selector */}
        <div className="irv-crop-ratios">
          <span className="irv-crop-ratios__label">Bentuk Bingkai:</span>
          <div className="irv-crop-ratios__chips">
            {Object.entries(ASPECT_RATIO_PRESETS).map(([key, opt]) => {
              const isSelected = selectedRatioKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`irv-crop-ratio-chip ${isSelected ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedRatioKey(key);
                    setPan({ x: 0, y: 0 });
                  }}
                  title={opt.description}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Viewport Canvas Area */}
        <div
          className="irv-crop-viewport"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Active Cutout Window */}
          <div
            className="irv-crop-window"
            style={{
              width: `${frameDimensions.width}px`,
              height: `${frameDimensions.height}px`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* The Draggable & Scalable Image */}
            <div
              className="irv-crop-image-layer"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageElementRef}
                src={imageSrc}
                alt="Pratinjau pemotongan"
                draggable={false}
                className="irv-crop-target-image"
              />
            </div>

            {/* Rule of Thirds Photography Grid Overlay */}
            <div className="irv-crop-grid" aria-hidden="true">
              <span className="irv-crop-grid__h1" />
              <span className="irv-crop-grid__h2" />
              <span className="irv-crop-grid__v1" />
              <span className="irv-crop-grid__v2" />
            </div>

            {/* Gesture Hint Overlay */}
            <div className="irv-crop-gesture-hint" aria-hidden="true">
              🖐️ Tahan & Geser Foto
            </div>
          </div>
        </div>

        {/* Zoom & Rotation Controls Bar */}
        <div className="irv-crop-toolbar">
          <div className="irv-crop-zoom-group">
            <span className="irv-crop-toolbar-icon">🔍</span>
            <button
              type="button"
              className="irv-crop-zoom-btn"
              onClick={() => setZoom((prev) => Math.max(1.0, parseFloat((prev - 0.15).toFixed(2))))}
              title="Perkecil Foto (Zoom Out)"
            >
              −
            </button>
            <input
              type="range"
              min="1.0"
              max="3.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="irv-crop-slider"
              aria-label="Tingkat pembesaran foto"
            />
            <button
              type="button"
              className="irv-crop-zoom-btn"
              onClick={() => setZoom((prev) => Math.min(3.5, parseFloat((prev + 0.15).toFixed(2))))}
              title="Perbesar Foto (Zoom In)"
            >
              +
            </button>
            <span className="irv-crop-zoom-value">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="irv-crop-action-tools">
            <button
              type="button"
              className="irv-crop-tool-btn"
              onClick={handleRotate}
              title="Putar 90 Derajat Searah Jarum Jam"
            >
              ⟳ Putar
            </button>
            <button
              type="button"
              className="irv-crop-tool-btn"
              onClick={handleResetCrop}
              title="Kembalikan ke posisi tengah"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="irv-crop-footer">
          <div className="irv-crop-footer__left">
            <button
              type="button"
              className="irv-crop-btn irv-crop-btn--secondary"
              onClick={onUseOriginal}
              disabled={isProcessing}
              title="Gunakan foto apa adanya tanpa memotong"
            >
              Pakai Foto Asli
            </button>
          </div>

          <div className="irv-crop-footer__right">
            <button
              type="button"
              className="irv-crop-btn irv-crop-btn--cancel"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Batal
            </button>
            <button
              type="button"
              className="irv-crop-btn irv-crop-btn--apply"
              onClick={handleApplyCrop}
              disabled={isProcessing}
            >
              {isProcessing ? '⏳ Memproses...' : '✓ Terapkan & Pasang Foto'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

