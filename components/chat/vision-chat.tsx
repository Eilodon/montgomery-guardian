"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Camera, Image, Check, AlertTriangle, Loader2, Upload, X } from "lucide-react";
import { AgentMessage } from "@/shared/types";

interface VisionChatProps {
  className?: string;
  onMessageSend?: (message: string, imageData?: string) => void;
  messages: AgentMessage[];
  isLoading?: boolean;
}

export function VisionChat({ 
  className = "", 
  onMessageSend,
  messages = [],
  isLoading = false
}: VisionChatProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle image selection
  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setSelectedImage(imageData);
        setImagePreview(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageSelect(files[0]);
    }
  };

  // Handle message send
  const handleSend = () => {
    if (inputMessage.trim() || selectedImage) {
      onMessageSend?.(inputMessage.trim(), selectedImage || undefined);
      setInputMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getImageInfo = (imageData: string) => {
    // Extract basic info from base64 image
    const base64Length = imageData.length - (imageData.indexOf(',') + 1);
    const fileSizeInBytes = base64Length * 0.75; // Approximate
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
    
    return {
      size: `${fileSizeInMB} MB`,
      type: imageData.includes('image/jpeg') ? 'JPEG' : 
            imageData.includes('image/png') ? 'PNG' : 'Unknown'
    };
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-purple-500 bg-purple-500/10">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <Camera className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Vision AI Assistant</h3>
          <p className="text-xs text-slate-400">Upload images for city issue analysis</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex p-4 rounded-full bg-purple-500/10 mb-4">
              <Camera className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Vision AI Analysis
            </h3>
            <p className="text-slate-400 max-w-md mx-auto mb-4">
              Upload a photo of any city issue (potholes, graffiti, broken lights, etc.) 
              and I'll analyze it and help you file a 311 report.
            </p>
            
            {/* Sample image types */}
            <div className="grid grid-cols-4 gap-4 max-w-lg mx-auto">
              {[
                { icon: "🕳️", label: "Potholes" },
                { icon: "🎨", label: "Graffiti" },
                { icon: "💡", label: "Lights" },
                { icon: "🗑️", label: "Trash" }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-xs text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="p-2 rounded-full bg-purple-500/10 flex-shrink-0">
                  <Camera className="w-4 h-4 text-purple-500" />
                </div>
              )}
              
              <div className={`max-w-[70%] ${message.role === "user" ? "order-first" : ""}`}>
                <div
                  className={`rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  {/* Display image in user message */}
                  {message.role === "user" && message.metadata?.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={message.metadata.imageUrl}
                        alt="Uploaded image"
                        className="max-w-full rounded-lg"
                      />
                    </div>
                  )}
                  
                  {/* Display analysis result */}
                  {message.role === "assistant" && message.metadata?.analysisResult && (
                    <div className="mt-3 p-3 bg-slate-700 rounded-lg">
                      <h4 className="font-semibold text-white mb-2">Analysis Results:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Issue Type:</span>
                          <span className="text-white capitalize">
                            {message.metadata.analysisResult.incidentType}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Severity:</span>
                          <span className={`capitalize ${
                            message.metadata.analysisResult.severity === 'high' ? 'text-red-400' :
                            message.metadata.analysisResult.severity === 'medium' ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {message.metadata.analysisResult.severity}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Confidence:</span>
                          <span className="text-white">
                            {(message.metadata.analysisResult.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        {message.metadata.analysisResult.description && (
                          <div>
                            <span className="text-slate-400">Description:</span>
                            <p className="text-white mt-1">
                              {message.metadata.analysisResult.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Message metadata */}
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span>{formatTimestamp(message.timestamp)}</span>
                  {message.role === "assistant" && (
                    <>
                      <span>•</span>
                      <span>Vision AI</span>
                    </>
                  )}
                </div>
              </div>
              
              {message.role === "user" && (
                <div className="p-2 rounded-full bg-blue-500 flex-shrink-0 order-first">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="p-2 rounded-full bg-purple-500/10 flex-shrink-0">
              <Camera className="w-4 h-4 text-purple-500 animate-pulse" />
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                <span className="text-sm text-slate-400">Analyzing image...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 p-4">
        {/* Image Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
            isDragging
              ? "border-purple-500 bg-purple-500/10"
              : "border-slate-600 bg-slate-800"
          } ${selectedImage ? "hidden" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <div className="text-center">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-300 mb-2">
              Drag & drop an image here or click to browse
            </p>
            <p className="text-xs text-slate-500">
              Supports: JPG, PNG, GIF (Max 10MB)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Select Image
            </button>
          </div>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-3 p-3 bg-slate-800 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">Selected Image</span>
              </div>
              <button
                onClick={removeImage}
                className="text-slate-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-3">
              <img
                src={imagePreview}
                alt="Selected"
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <div className="text-xs text-slate-400 mb-1">
                  {getImageInfo(imagePreview).type} • {getImageInfo(imagePreview).size}
                </div>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe what you want me to analyze..."
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-400 text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Regular input (when no image) */}
        {!imagePreview && (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe the city issue or upload an image..."
              className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-400"
              disabled={isLoading}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              title="Upload image"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() && !selectedImage}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                inputMessage.trim() || selectedImage
                  ? "bg-purple-500 text-white hover:bg-purple-600"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
        
        {/* Quick Actions */}
        {!imagePreview && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setInputMessage("Analyze this pothole")}
              className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded-full hover:bg-slate-600 transition-colors"
            >
              Pothole
            </button>
            <button
              onClick={() => setInputMessage("Analyze this graffiti")}
              className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded-full hover:bg-slate-600 transition-colors"
            >
              Graffiti
            </button>
            <button
              onClick={() => setInputMessage("Analyze this broken light")}
              className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded-full hover:bg-slate-600 transition-colors"
            >
              Broken Light
            </button>
            <button
              onClick={() => setInputMessage("Analyze this flooding issue")}
              className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded-full hover:bg-slate-600 transition-colors"
            >
              Flooding
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
