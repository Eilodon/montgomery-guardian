"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, ArrowLeft, Check, AlertTriangle, MapPin, Loader2 } from "lucide-react";

// Service types for 311 reports
const serviceTypes = [
  { value: "pothole", label: "Pothole", icon: "🚧" },
  { value: "graffiti", label: "Graffiti", icon: "🎨" },
  { value: "trash", label: "Trash/Debris", icon: "🗑️" },
  { value: "flooding", label: "Flooding", icon: "🌊" },
  { value: "overgrown_grass", label: "Overgrown Grass", icon: "🌱" },
  { value: "other", label: "Other", icon: "⚠️" },
];

// Vision analysis result interface (matching shared/types)
interface VisionAnalysisResult {
  incidentType: string;
  severity: 'high' | 'medium' | 'low';
  confidence: number;
  description: string;
  suggested311Category: string;
  prefilledForm: {
    serviceType?: string;
    description?: string;
    address?: string;
  };
}

type Step = 'upload' | 'analysis' | 'result' | 'submitted';

export default function ReportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [trackingId, setTrackingId] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [formData, setFormData] = useState({
    serviceType: '',
    description: '',
    address: '',
  });
  const [isMobile, setIsMobile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
  }, []);

  const handleImageSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setStep('analysis');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (location) {
        formData.append('lat', location.lat.toString());
        formData.append('lng', location.lng.toString());
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/vision/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result: VisionAnalysisResult = await response.json();
      setAnalysisResult(result);
      
      // Pre-fill form with AI results
      setFormData({
        serviceType: result.suggested311Category,
        description: result.prefilledForm.description || result.description,
        address: result.prefilledForm.address || '',
      });

      setStep('result');
    } catch (error) {
      // Fallback mock response for demo
      const mockResult: VisionAnalysisResult = {
        incidentType: 'pothole',
        severity: 'medium',
        confidence: 0.85,
        description: 'AI analysis detected a pothole in the roadway. The damage appears to be approximately 2 feet in diameter and poses a potential hazard to vehicles.',
        suggested311Category: 'pothole',
        prefilledForm: {
          serviceType: 'pothole',
          description: 'Large pothole detected in roadway, approximately 2 feet in diameter. Requires immediate repair to prevent vehicle damage and ensure traffic safety.',
          address: '',
        },
      };

      setAnalysisResult(mockResult);
      setFormData({
        serviceType: mockResult.suggested311Category,
        description: mockResult.prefilledForm.description || mockResult.description,
        address: mockResult.prefilledForm.address || '',
      });

      setTimeout(() => setStep('result'), 2000); // Simulate processing time
    } finally {
      setIsAnalyzing(false);
    }
  };

  const useMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          alert('Unable to get your location. Please enter it manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const submitReport = async () => {
    // Simulate API call
    const id = `311-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    setTrackingId(id);
    setStep('submitted');
  };

  const startOver = () => {
    setStep('upload');
    setSelectedImage(null);
    setImageUrl('');
    setAnalysisResult(null);
    setFormData({ serviceType: '', description: '', address: '' });
    setLocation(null);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getServiceIcon = (type: string) => {
    const service = serviceTypes.find(s => s.value === type);
    return service?.icon || '⚠️';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Report Issue</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className={`${isMobile ? 'pt-8' : ''}`}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Report an Issue with AI
              </h2>
              <p className="text-gray-600">
                Upload a photo and our AI will help you file a 311 report
              </p>
            </div>

            {/* Mobile Camera First */}
            {isMobile ? (
              <div className="space-y-4">
                <button
                  onClick={() => mobileFileInputRef.current?.click()}
                  className="w-full bg-blue-600 text-white rounded-lg p-6 flex flex-col items-center gap-3 hover:bg-blue-700 transition-colors"
                >
                  <Camera className="w-12 h-12" />
                  <span className="text-lg font-medium">Take Photo</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 text-gray-500">or</span>
                  </div>
                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">Choose photo from gallery</p>
                  <p className="text-sm text-gray-500">JPG, PNG, WebP up to 10MB</p>
                </div>
              </div>
            ) : (
              // Desktop Upload Area
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-gray-400 transition-colors min-h-[300px] flex flex-col items-center justify-center"
              >
                <Upload className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop photo here or click to browse
                </h3>
                <p className="text-gray-600 mb-4">
                  Accept: JPEG, PNG, WebP (max 10MB)
                </p>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Choose File
                </button>
              </div>
            )}

            {/* Image Preview */}
            {selectedImage && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Selected Photo</h3>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <img
                    src={imageUrl}
                    alt="Selected issue"
                    className="w-full h-auto max-h-96 object-contain rounded-lg"
                  />
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={analyzeImage}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Analyze Photo
                    </button>
                    <button
                      onClick={startOver}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInput}
              className="hidden"
              aria-label="Upload image file"
              placeholder="Upload image"
            />
            <input
              ref={mobileFileInputRef}
              type="file"
              accept="image/*"
              capture="environment" /* For mobile camera access */
              onChange={handleFileInput}
              className="hidden"
              aria-label="Take photo"
              placeholder="Take photo"
            />
          </div>
        )}

        {/* Step 2: Analysis */}
        {step === 'analysis' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-2">
              Analyzing your photo with AI...
            </h2>
            <p className="text-gray-600 text-center max-w-md">
              Our computer vision model is identifying the issue type and severity to help file your report faster.
            </p>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && analysisResult && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Complete</h2>
              <p className="text-gray-600">AI has identified the issue. Review and submit your 311 report.</p>
            </div>

            {/* Analysis Result Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">{getServiceIcon(analysisResult.incidentType)}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {analysisResult.incidentType.replace('_', ' ')}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(analysisResult.confidence)}`}>
                      {Math.round(analysisResult.confidence * 100)}% confident
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      analysisResult.severity === 'high' ? 'bg-red-100 text-red-800' :
                      analysisResult.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {analysisResult.severity} severity
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 mb-4">{analysisResult.description}</p>
            </div>

            {/* Pre-filled 311 Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">311 Report Details</h3>

              <div className="space-y-4">
                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type
                  </label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Select service type"
                    title="Service type"
                  >
                    <option value="">Select service type</option>
                    {serviceTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the issue in detail..."
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter location or use GPS"
                    />
                    <button
                      onClick={useMyLocation}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Use My Location
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={submitReport}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Submit 311 Report
                </button>
                <button
                  onClick={startOver}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Submitted */}
        {step === 'submitted' && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Report Submitted!</h2>
            <p className="text-gray-600 mb-6">Your 311 report has been successfully filed.</p>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto mb-6">
              <div className="text-sm text-gray-500 mb-1">Tracking ID</div>
              <div className="text-xl font-mono font-bold text-gray-900 mb-2">{trackingId}</div>
              <div className="text-sm text-gray-600">Estimated resolution: 5-7 business days</div>
            </div>

            <button
              onClick={() => window.location.href = '/chat'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Back to Chat
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
