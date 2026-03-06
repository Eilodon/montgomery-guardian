"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle, Clock, MapPin, FileText, Send, ExternalLink } from "lucide-react";
import { VisionAnalysisResult, ServiceRequest311 } from "@/shared/types";

interface AnalysisResultProps {
  result: VisionAnalysisResult;
  onSubmit?: (formData: Partial<ServiceRequest311>) => void;
  isSubmitting?: boolean;
}

export function AnalysisResult({ result, onSubmit, isSubmitting = false }: AnalysisResultProps) {
  const [notes, setNotes] = useState("");
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [formData, setFormData] = useState(result.prefilledForm);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-amber-600 bg-amber-50 border-amber-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high": return AlertTriangle;
      case "medium": return Clock;
      case "low": return CheckCircle;
      default: return CheckCircle;
    }
  };

  const SeverityIcon = getSeverityIcon(result.severity);

  const handleSubmit = () => {
    const finalFormData = {
      ...formData,
      description: formData.description 
        ? `${formData.description}\n\nAdditional notes: ${notes}`.trim()
        : notes.trim() || undefined,
    };
    onSubmit?.(finalFormData);
  };

  const handleFormFieldChange = (field: keyof ServiceRequest311, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* AI Analysis Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">AI</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Vision Analysis Complete</h3>
            <p className="text-sm text-blue-700">AI has identified and analyzed the issue</p>
          </div>
        </div>

        {/* Analysis Results */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Issue Identified:</h4>
            <p className="text-blue-800 capitalize">{result.incidentType.replace('_', ' ')}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Confidence Score:</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-blue-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${result.confidence * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-blue-800">
                {Math.round(result.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-medium text-blue-900 mb-2">AI Description:</h4>
          <p className="text-blue-800">{result.description}</p>
        </div>
      </div>

      {/* Severity Badge */}
      <div className={`flex items-center gap-3 p-4 border rounded-lg ${getSeverityColor(result.severity)}`}>
        <SeverityIcon className="w-5 h-5" />
        <div>
          <h4 className="font-medium">Severity Level:</h4>
          <p className="text-sm capitalize">{result.severity} Priority</p>
        </div>
      </div>

      {/* Pre-filled 311 Form */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">311 Service Request</h3>
            <button
              onClick={() => setIsEditingForm(!isEditingForm)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isEditingForm ? "Preview" : "Edit Details"}
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Form pre-filled by AI. Please review before submitting.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Service Type
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="capitalize">{result.incidentType.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            {isEditingForm ? (
              <textarea
                value={formData.description || ""}
                onChange={(e) => handleFormFieldChange("description", e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg resize-none h-24"
                placeholder="Describe the issue in detail..."
              />
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[6rem]">
                {formData.description || "No description provided"}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </label>
            {isEditingForm && formData.latitude && formData.longitude ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => handleFormFieldChange("address", e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg"
                  placeholder="Enter address..."
                />
                <div className="text-xs text-slate-500">
                  GPS: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                {formData.address || "Location detected automatically"}
                {formData.latitude && formData.longitude && (
                  <div className="text-xs text-slate-500 mt-1">
                    GPS: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg resize-none h-20"
              placeholder="Add any additional information that might help..."
            />
          </div>

          {/* Estimated Resolution Time */}
          {result.prefilledForm.estimatedResolutionDays && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Estimated Resolution: {result.prefilledForm.estimatedResolutionDays} business days
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => window.history.back()}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit 311 Request
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-600">
            <p className="font-medium mb-1">What happens next?</p>
            <ul className="space-y-1">
              <li>• Your request will be submitted to Montgomery 311 services</li>
              <li>• You'll receive a tracking number for status updates</li>
              <li>• City staff will review and assign priority based on severity</li>
              <li>• You can track progress through this platform or 311 website</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
