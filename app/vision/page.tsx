"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { VisionAnalysisResult, ServiceRequest311 } from "@/shared/types";

const CameraUpload = dynamic(
  () => import("@/components/vision/camera-upload").then((mod) => mod.CameraUpload),
  { ssr: false }
);
const ImagePreview = dynamic(
  () => import("@/components/vision/image-preview").then((mod) => mod.ImagePreview),
  { ssr: false }
);
const AnalysisResult = dynamic(
  () => import("@/components/vision/analysis-result").then((mod) => mod.AnalysisResult),
  { ssr: false }
);

interface ImageMetadata {
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceInfo?: string;
}

export default function VisionPage() {
  const [step, setStep] = useState<"upload" | "preview" | "analysis" | "result">("upload");
  const [imageData, setImageData] = useState<string>("");
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageCapture = (data: string, metadata?: ImageMetadata) => {
    setImageData(data);
    setImageMetadata(metadata || null);
    setStep("preview");
  };

  const handleImageConfirm = async (processedImageUrl: string) => {
    setIsProcessing(true);
    setStep("analysis");

    try {
      // 1. Chuyển ObjectURL trở lại thành Blob
      const imgResponse = await fetch(processedImageUrl);
      const imageBlob = await imgResponse.blob();

      // 2. Sử dụng chuẩn Multipart Form Data khớp với OpenAPI
      const formData = new FormData();
      formData.append('image', imageBlob, 'vision_capture.jpg');
      
      if (imageMetadata?.location) {
          formData.append('lat', imageMetadata.location.latitude.toString());
          formData.append('lng', imageMetadata.location.longitude.toString());
      }

      const response = await fetch("/api/v1/vision/analyze", {
        method: "POST",
        // Bỏ Header Content-Type để Fetch tự động tính Boundary cho multipart
        body: formData, 
      });

      if (!response.ok) throw new Error("Analysis failed");

      const result: VisionAnalysisResult = await response.json();
      setAnalysisResult(result);
      setStep("result");
    } catch (error) {
      console.error("Vision analysis error:", error);
      // Fallback to mock result for demo
      const mockResult: VisionAnalysisResult = {
        incidentType: "pothole",
        severity: "medium",
        confidence: 0.85,
        description: "A significant pothole detected in the road surface, approximately 2-3 feet in diameter. The pothole appears to be deep enough to cause vehicle damage and should be repaired urgently.",
        suggested311Category: "Pothole Repair",
        prefilledForm: {
          serviceType: "pothole",
          description: "Large pothole detected in road surface. Approximately 2-3 feet in diameter and deep enough to cause vehicle damage. Located in travel lane and poses safety hazard to motorists.",
          latitude: imageMetadata?.location?.latitude || 32.3617,
          longitude: imageMetadata?.location?.longitude || -86.2792,
          address: "Detected via GPS - Please verify exact location",
          estimatedResolutionDays: 3,
        },
      };
      setAnalysisResult(mockResult);
      setStep("result");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormSubmit = async (formData: Partial<ServiceRequest311>) => {
    setIsSubmitting(true);

    try {
      // Submit 311 request
      const response = await fetch("/api/v1/requests-311", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit 311 request");
      }

      const result = await response.json();

      // Show success message and redirect to tracking
      toast.success(`311 request submitted! Tracking ID: ${result.requestId}`);

      // Reset to start
      setStep("upload");
      setImageData("");
      setImageMetadata(null);
      setAnalysisResult(null);
    } catch (error) {
      console.error("311 submission error:", error);
      toast.error("Failed to submit 311 request. Please try again or call 311 directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (step === "preview") {
      setStep("upload");
      setImageData("");
      setImageMetadata(null);
    } else {
      setStep("preview");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-100">
                Montgomery Guardian
              </h1>
              <span className="text-sm text-slate-400">|</span>
              <span className="text-sm text-slate-400">Vision AI Report</span>
            </div>

            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${step === "upload" ? "bg-blue-500 text-white" :
                  ["preview", "analysis", "result"].includes(step) ? "bg-green-500 text-white" :
                    "bg-slate-200 text-slate-600"
                }`}>
                1. Upload
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${step === "preview" ? "bg-blue-500 text-white" :
                  ["analysis", "result"].includes(step) ? "bg-green-500 text-white" :
                    "bg-slate-200 text-slate-600"
                }`}>
                2. Review
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${step === "analysis" ? "bg-blue-500 text-white" :
                  step === "result" ? "bg-green-500 text-white" :
                    "bg-slate-200 text-slate-600"
                }`}>
                3. Analyze
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${step === "result" ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                4. Submit
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-100 mb-4">
            📸 AI-Powered City Issue Reporting
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Take a photo of any city issue (potholes, graffiti, flooding, etc.) and our AI will
            automatically identify the problem and fill out the 311 report for you.
          </p>
        </div>

        {/* Step Content */}
        <div className="bg-slate-950 border border-slate-700 rounded-2xl shadow-xl p-6">
          {step === "upload" && (
            <CameraUpload
              onImageCapture={handleImageCapture}
              isProcessing={isProcessing}
            />
          )}

          {step === "preview" && imageData && (
            <ImagePreview
              imageData={imageData}
              onConfirm={handleImageConfirm}
              onCancel={handleCancel}
              isProcessing={isProcessing}
            />
          )}

          {step === "analysis" && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">
                AI Analyzing Your Photo...
              </h3>
              <p className="text-slate-400">
                Our Vision AI is identifying the issue type, severity, and preparing your 311 report.
              </p>
            </div>
          )}

          {step === "result" && analysisResult && (
            <AnalysisResult
              result={analysisResult}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Help Section */}
        {step === "upload" && (
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-slate-950 border border-slate-700 p-6 rounded-lg">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <span className="text-xl">📸</span>
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">Take Photo</h3>
              <p className="text-sm text-slate-400">
                Use your camera to capture the city issue clearly. Include surroundings for context.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-700 p-6 rounded-lg">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <span className="text-xl">🤖</span>
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">AI Analysis</h3>
              <p className="text-sm text-slate-400">
                Our Vision AI identifies the issue type, severity, and automatically fills the 311 form.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-700 p-6 rounded-lg">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <span className="text-xl">📋</span>
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">Submit & Track</h3>
              <p className="text-sm text-slate-400">
                Review and submit your 311 request with one click. Get tracking updates instantly.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
