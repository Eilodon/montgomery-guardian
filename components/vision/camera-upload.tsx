"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, AlertCircle } from "lucide-react";

interface CameraUploadProps {
  onImageCapture: (imageData: string, metadata?: ImageMetadata) => void;
  isProcessing?: boolean;
}

interface ImageMetadata {
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceInfo?: string;
}

export function CameraUpload({ onImageCapture, isProcessing = false }: CameraUploadProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile device
  useState(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  });

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isMobile ? "environment" : "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please check permissions or use file upload instead.");
      setIsCameraActive(false);
    }
  }, [isMobile]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    
    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data as base64
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    
    // Get current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const metadata: ImageMetadata = {
          timestamp: new Date().toISOString(),
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          },
          deviceInfo: navigator.userAgent
        };
        onImageCapture(imageData, metadata);
        stopCamera();
      },
      (error) => {
        console.warn("Location access denied:", error);
        const metadata: ImageMetadata = {
          timestamp: new Date().toISOString(),
          deviceInfo: navigator.userAgent
        };
        onImageCapture(imageData, metadata);
        stopCamera();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [onImageCapture, stopCamera]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      
      // Extract EXIF data for location if available
      const metadata: ImageMetadata = {
        timestamp: new Date().toISOString(),
        deviceInfo: `Upload: ${file.type}, ${Math.round(file.size / 1024)}KB`
      };
      
      onImageCapture(imageData, metadata);
    };
    
    reader.readAsDataURL(file);
  }, [onImageCapture]);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Camera View */}
      {isCameraActive ? (
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
          />
          
          {/* Camera Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex justify-center gap-4">
              <button
                onClick={capturePhoto}
                disabled={isProcessing}
                className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : "📸 Capture"}
              </button>
              
              <button
                onClick={stopCamera}
                disabled={isProcessing}
                className="px-4 py-3 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Options */
        <div className="space-y-4">
          {/* Camera Option */}
          <button
            onClick={startCamera}
            disabled={isProcessing}
            className="w-full p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center gap-3">
              <Camera className="w-12 h-12 text-slate-400" />
              <div className="text-center">
                <h3 className="font-medium text-slate-900">Take Photo</h3>
                <p className="text-sm text-slate-500">Use camera to capture incident</p>
              </div>
            </div>
          </button>

          {/* File Upload Option */}
          <button
            onClick={triggerFileUpload}
            disabled={isProcessing}
            className="w-full p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-slate-400" />
              <div className="text-center">
                <h3 className="font-medium text-slate-900">Upload Image</h3>
                <p className="text-sm text-slate-500">Choose from your device</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 10MB</p>
              </div>
            </div>
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Hidden Canvas for Photo Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">📸 Photo Guidelines:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Capture the issue clearly (pothole, graffiti, flooding, etc.)</li>
          <li>• Include surroundings for context</li>
          <li>• Ensure good lighting</li>
          <li>• Location services will be used automatically</li>
        </ul>
      </div>
    </div>
  );
}
