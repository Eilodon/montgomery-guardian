"use client";

import { useState, useCallback } from "react";
import { X, Crop, RotateCw, ZoomIn, AlertCircle } from "lucide-react";

interface ImagePreviewProps {
  imageData: string;
  onConfirm: (processedImage: string) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function ImagePreview({ imageData, onConfirm, onCancel, isProcessing = false }: ImagePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  }, []);

  const handleCrop = useCallback(() => {
    setIsEditing(!isEditing);
  }, [isEditing]);

  const applyCrop = useCallback(() => {
    // In a real implementation, this would crop the image
    // For now, we'll just confirm the original image
    onConfirm(imageData);
  }, [imageData, onConfirm]);

  const imageStyle = {
    transform: `rotate(${rotation}deg) scale(${zoom})`,
    transition: "transform 0.3s ease",
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Review Photo</h3>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image Preview */}
      <div className="relative bg-slate-100 rounded-lg overflow-hidden mb-4">
        <div className="aspect-video relative">
          <img
            src={imageData}
            alt="Incident photo"
            style={imageStyle}
            className="w-full h-full object-contain"
          />
          
          {/* Crop Overlay (when editing) */}
          {isEditing && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/20"
              style={{
                left: `${cropArea.x}%`,
                top: `${cropArea.y}%`,
                width: `${cropArea.width}%`,
                height: `${cropArea.height}%`,
              }}
            >
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize" />
            </div>
          )}
        </div>
      </div>

      {/* Editing Tools */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={handleRotate}
          disabled={isProcessing}
          className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Rotate image"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleZoom(-0.1)}
          disabled={isProcessing || zoom <= 0.5}
          className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Zoom out"
        >
          <ZoomIn className="w-4 h-4 scale-x-[-1]" />
        </button>

        <span className="text-sm text-slate-600 min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => handleZoom(0.1)}
          disabled={isProcessing || zoom >= 3}
          className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={handleCrop}
          disabled={isProcessing}
          className={`p-2 border rounded-lg transition-colors disabled:opacity-50 ${
            isEditing
              ? "bg-blue-500 border-blue-500 text-white hover:bg-blue-600"
              : "bg-white border-slate-300 hover:bg-slate-50"
          }`}
          title="Crop image"
        >
          <Crop className="w-4 h-4" />
        </button>
      </div>

      {/* Image Info */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="font-medium text-slate-900 mb-2">📋 Image Details:</h4>
        <div className="text-sm text-slate-600 space-y-1">
          <p>• Format: JPEG</p>
          <p>• Quality: High (recommended for analysis)</p>
          <p>• Location: Detected automatically</p>
          <p>• Analysis: AI will identify issue type and severity</p>
        </div>
      </div>

      {/* Warning Message */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-1">Before you submit:</p>
          <ul className="space-y-1">
            <li>• Make sure the issue is clearly visible</li>
            <li>• Remove any sensitive information if needed</li>
            <li>• Ensure the photo shows the problem accurately</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Retake Photo
        </button>

        {isEditing ? (
          <button
            onClick={applyCrop}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Crop
          </button>
        ) : (
          <button
            onClick={() => onConfirm(imageData)}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Analyzing..." : "Analyze with AI 🤖"}
          </button>
        )}
      </div>
    </div>
  );
}
