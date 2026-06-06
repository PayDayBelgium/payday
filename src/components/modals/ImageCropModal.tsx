import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { X, RotateCw, ZoomIn } from 'lucide-react';
import type { ImageMetadata } from '../../types';

interface ImageCropModalProps {
  image: string;
  onClose: () => void;
  onCropComplete: (croppedImage: string, metadata: ImageMetadata) => void;
  initialMetadata?: ImageMetadata;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  image,
  onClose,
  onCropComplete,
  initialMetadata,
}) => {
  const { t } = useTranslation();
  const [crop, setCrop] = useState(initialMetadata?.crop ?? { x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialMetadata?.zoom ?? 1);
  const [rotation, setRotation] = useState(initialMetadata?.rotation ?? 0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [addBorder, setAddBorder] = useState(initialMetadata?.addBorder ?? false);
  const [borderSize, setBorderSize] = useState(initialMetadata?.borderSize ?? 10);
  const [borderColor, setBorderColor] = useState(initialMetadata?.borderColor ?? '#e5e7eb'); // gray-200
  const [borderRadius, setBorderRadius] = useState(initialMetadata?.borderRadius ?? 10);
  const [backgroundColor, setBackgroundColor] = useState(
    initialMetadata?.backgroundColor ?? '#1f2937'
  ); // gray-800

  const onCropChange = (location: { x: number; y: number }) => {
    setCrop(location);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0,
    addBorder = false,
    borderSize = 10,
    borderColor = '#e5e7eb',
    borderRadius = 10,
    backgroundColor = '#1f2937'
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const rotRad = (rotation * Math.PI) / 180;

    // Calculate bounding box of the rotated image
    const bBoxWidth =
      Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
    const bBoxHeight =
      Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

    // Set canvas size to the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate to center and rotate
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);

    // Draw rotated image centered
    ctx.drawImage(image, -image.width / 2, -image.height / 2);

    // Reset transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // First, extract just the cropped area WITHOUT border
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      throw new Error('No 2d context');
    }

    tempCanvas.width = pixelCrop.width;
    tempCanvas.height = pixelCrop.height;

    // Draw the cropped portion to temp canvas
    tempCtx.drawImage(
      canvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Now create final canvas with border
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');

    if (!finalCtx) {
      throw new Error('No 2d context');
    }

    // Calculate final size with optional border
    const finalSize = pixelCrop.width;
    const finalSizeWithBorder = addBorder ? finalSize + borderSize * 2 : finalSize;

    finalCanvas.width = finalSizeWithBorder;
    finalCanvas.height = finalSizeWithBorder;

    // Calculate offset for border
    const offsetX = addBorder ? borderSize : 0;
    const offsetY = addBorder ? borderSize : 0;

    // Create rounded rectangle path helper
    const roundedRectPath = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    // If border is enabled, first fill with border color, then background color
    if (addBorder) {
      // Draw border (outer rounded rectangle with border color)
      finalCtx.save();
      roundedRectPath(finalCtx, 0, 0, finalSizeWithBorder, finalSizeWithBorder, borderRadius);
      finalCtx.fillStyle = borderColor;
      finalCtx.fill();
      finalCtx.restore();

      // Draw background (inner rounded rectangle with background color)
      finalCtx.save();
      const innerRadius = Math.max(0, borderRadius - borderSize);
      roundedRectPath(finalCtx, offsetX, offsetY, finalSize, finalSize, innerRadius);
      finalCtx.fillStyle = backgroundColor;
      finalCtx.fill();
      finalCtx.restore();
    }

    // Draw the cropped image with clipping for rounded corners
    finalCtx.save();
    const innerRadius = addBorder ? Math.max(0, borderRadius - borderSize) : borderRadius;
    roundedRectPath(finalCtx, offsetX, offsetY, finalSize, finalSize, innerRadius);
    finalCtx.clip();

    // Draw the cropped image (already rotated and cropped)
    finalCtx.drawImage(
      tempCanvas,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
      offsetX,
      offsetY,
      pixelCrop.width,
      pixelCrop.height
    );

    finalCtx.restore();

    // Return as data URL
    return new Promise((resolve) => {
      finalCanvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
        }
      }, 'image/png');
    });
  };

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(
        image,
        croppedAreaPixels,
        rotation,
        addBorder,
        borderSize,
        borderColor,
        borderRadius,
        backgroundColor
      );
      const metadata: ImageMetadata = {
        backgroundColor,
        rotation,
        zoom,
        crop,
        addBorder,
        borderSize,
        borderColor,
        borderRadius,
      };
      onCropComplete(croppedImage, metadata);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-line dark:border-trading-dark-600">
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">
            {t('imageCrop.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-ink-600 dark:text-ink-400" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="relative flex-1" style={{ minHeight: '400px', backgroundColor }}>
          <style
            dangerouslySetInnerHTML={{
              __html: addBorder
                ? `
              .reactEasyCrop_CropArea {
                border: ${borderSize}px solid ${borderColor} !important;
                border-radius: ${borderRadius}px !important;
                box-sizing: border-box !important;
              }
            `
                : '',
            }}
          />
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteHandler}
            cropShape="rect"
          />
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-surface-line dark:border-trading-dark-600 space-y-3">
          {/* Zoom and Rotation Controls */}
          <div className="grid grid-cols-2 gap-3">
            {/* Zoom Control */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ink-700 dark:text-ink-300">
                <ZoomIn className="w-3 h-3 inline mr-1" />
                {t('imageCrop.zoom')}
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-surface-muted dark:bg-trading-dark-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Rotation Control */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ink-700 dark:text-ink-300">
                <RotateCw className="w-3 h-3 inline mr-1" />
                {t('imageCrop.rotation')}
              </label>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full h-2 bg-surface-muted dark:bg-trading-dark-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Background Color */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-600 dark:text-ink-400">
              {t('imageCrop.backgroundColor')}:
            </span>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-10 h-6 rounded border border-ink-200 dark:border-trading-dark-500 cursor-pointer"
            />
            <span className="text-xs font-mono text-ink-500">{backgroundColor}</span>
          </div>

          {/* Border Control */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="add-border-checkbox"
                checked={addBorder}
                onChange={(e) => setAddBorder(e.target.checked)}
                className="w-4 h-4 rounded border-ink-200 dark:border-trading-dark-500 text-primary-700 focus:ring-primary-500 cursor-pointer"
              />
              <label
                htmlFor="add-border-checkbox"
                className="text-sm font-medium text-ink-700 dark:text-ink-300 cursor-pointer"
              >
                {t('imageCrop.addBorder')}
              </label>
            </div>
            {addBorder && (
              <div className="pl-6 space-y-2">
                {/* Border Size and Radius in a row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-ink-600 dark:text-ink-400">
                      {t('imageCrop.borderSize')}: {borderSize}px
                    </span>
                    <input
                      type="range"
                      min={5}
                      max={30}
                      step={5}
                      value={borderSize}
                      onChange={(e) => setBorderSize(Number(e.target.value))}
                      className="w-full h-2 bg-surface-muted dark:bg-trading-dark-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-ink-600 dark:text-ink-400">
                      {t('imageCrop.borderRadius')}: {borderRadius}px
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={5}
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(Number(e.target.value))}
                      className="w-full h-2 bg-surface-muted dark:bg-trading-dark-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                {/* Border Color */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-600 dark:text-ink-400">
                    {t('imageCrop.borderColor')}:
                  </span>
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-10 h-6 rounded border border-ink-200 dark:border-trading-dark-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-ink-500">{borderColor}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-ink-200 dark:border-trading-dark-500 text-ink-700 dark:text-ink-300 rounded-lg hover:bg-surface dark:hover:bg-trading-dark-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleCrop}
              className="flex-1 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg transition-colors"
            >
              {t('imageCrop.crop')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
