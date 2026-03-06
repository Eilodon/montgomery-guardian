"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Shield, Wrench, Camera, Globe, Loader2, Check, AlertTriangle } from "lucide-react";
import { AgentMessage } from "@/shared/types";

interface EnhancedChatProps {
  className?: string;
  onMessageSend?: (message: string, imageData?: string) => void;
  messages: AgentMessage[];
  isLoading?: boolean;
  agentType?: "safety_intel" | "service_311" | "vision" | "web_scraper" | "general";
}

// Agent configurations
const AGENT_CONFIG = {
  safety_intel: {
    name: "Safety Intelligence",
    icon: Shield,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
    description: "Crime data and safety analysis"
  },
  service_311: {
    name: "311 Services",
    icon: Wrench,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500",
    description: "City services and requests"
  },
  vision: {
    name: "Vision AI",
    icon: Camera,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500",
    description: "Image analysis and reporting"
  },
  web_scraper: {
    name: "Web Intelligence",
    icon: Globe,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
    description: "Real-time news and updates"
  },
  general: {
    name: "General Assistant",
    icon: Bot,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500",
    description: "General information and help"
  }
};

export function EnhancedChat({ 
  className = "", 
  onMessageSend,
  messages = [],
  isLoading = false,
  agentType = "general"
}: EnhancedChatProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showAgentInfo, setShowAgentInfo] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentAgent = AGENT_CONFIG[agentType];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle message send
  const handleSend = () => {
    if (inputMessage.trim() || selectedImage) {
      onMessageSend?.(inputMessage.trim(), selectedImage || undefined);
      setInputMessage("");
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setInputMessage(value);
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1000);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-500";
    if (confidence >= 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${className}`}>
      {/* Agent Header */}
      <div className={`flex items-center justify-between p-4 border-b ${currentAgent.borderColor}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${currentAgent.bgColor}`}>
            <currentAgent.icon className={`w-5 h-5 ${currentAgent.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{currentAgent.name}</h3>
            <p className="text-xs text-slate-400">{currentAgent.description}</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowAgentInfo(!showAgentInfo)}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      </div>

      {/* Agent Info Panel */}
      {showAgentInfo && (
        <div className={`p-3 border-b ${currentAgent.bgColor}`}>
          <div className="text-sm text-slate-300">
            <p className="mb-2">
              <strong>Current Agent:</strong> {currentAgent.name}
            </p>
            <p className="mb-2">
              <strong>Specialization:</strong> {currentAgent.description}
            </p>
            <p className="mb-2">
              <strong>Capabilities:</strong>
            </p>
            <ul className="list-disc list-inside text-xs space-y-1 ml-2">
              {agentType === "safety_intel" && (
                <>
                  <li>Crime statistics and analysis</li>
                  <li>Safety assessments and recommendations</li>
                  <li>Emergency information and procedures</li>
                  <li>Police activity monitoring</li>
                </>
              )}
              {agentType === "service_311" && (
                <>
                  <li>311 service request processing</li>
                  <li>City services information</li>
                  <li>Request status tracking</li>
                  <li>Municipal procedures guidance</li>
                </>
              )}
              {agentType === "vision" && (
                <>
                  <li>Image analysis for city issues</li>
                  <li>Auto-filled 311 report generation</li>
                  <li>Visual problem identification</li>
                  <li>Photo-to-report workflow</li>
                </>
              )}
              {agentType === "web_scraper" && (
                <>
                  <li>Real-time news monitoring</li>
                  <li>City announcement tracking</li>
                  <li>Emergency alert aggregation</li>
                  <li>Web content analysis</li>
                </>
              )}
              {agentType === "general" && (
                <>
                  <li>General city information</li>
                  <li>Multi-agent coordination</li>
                  <li>Basic assistance and guidance</li>
                  <li>Service routing</li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className={`inline-flex p-4 rounded-full ${currentAgent.bgColor} mb-4`}>
              <currentAgent.icon className={`w-8 h-8 ${currentAgent.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Welcome to {currentAgent.name}
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              {currentAgent.description}. Ask me anything about Montgomery city services, safety, or current events.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className={`p-2 rounded-full ${currentAgent.bgColor} flex-shrink-0`}>
                  <currentAgent.icon className={`w-4 h-4 ${currentAgent.color}`} />
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
                  
                  {message.metadata?.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={message.metadata.imageUrl}
                        alt="Uploaded image"
                        className="max-w-full rounded-lg"
                      />
                    </div>
                  )}
                </div>
                
                {/* Message metadata */}
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>{formatTimestamp(message.timestamp)}</span>
                    {message.confidence && (
                      <>
                        <span>•</span>
                        <span className={getConfidenceColor(message.confidence)}>
                          {getConfidenceLabel(message.confidence)} confidence
                        </span>
                      </>
                    )}
                    {message.agentType && (
                      <>
                        <span>•</span>
                        <span>{AGENT_CONFIG[message.agentType]?.name || message.agentType}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {message.role === "user" && (
                <div className="p-2 rounded-full bg-blue-500 flex-shrink-0 order-first">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className={`p-2 rounded-full ${currentAgent.bgColor} flex-shrink-0`}>
              <currentAgent.icon className={`w-4 h-4 ${currentAgent.color} animate-pulse`} />
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-1">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                <span className="text-sm text-slate-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 p-4">
        {/* Image Preview */}
        {selectedImage && (
          <div className="mb-3 p-2 bg-slate-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">Image selected</span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-slate-400 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </div>
            <img
              src={selectedImage}
              alt="Selected"
              className="mt-2 max-w-full rounded-lg max-h-32 object-cover"
            />
          </div>
        )}

        <div className="flex gap-2">
          {/* Image Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg ${currentAgent.bgColor} ${currentAgent.borderColor} border transition-colors`}
            title="Upload image for analysis"
          >
            <Camera className="w-5 h-5 text-slate-300" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask ${currentAgent.name} about Montgomery...`}
              className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
              disabled={isLoading}
            />
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() && !selectedImage}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              inputMessage.trim() || selectedImage
                ? "bg-blue-500 text-white hover:bg-blue-600"
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
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setInputMessage("What's the crime rate in my area?")}
            className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 transition-colors"
          >
            Crime Rate
          </button>
          <button
            onClick={() => setInputMessage("How do I report a pothole?")}
            className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 transition-colors"
          >
            Report Issue
          </button>
          <button
            onClick={() => setInputMessage("Any current safety alerts?")}
            className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 transition-colors"
          >
            Safety Alerts
          </button>
          <button
            onClick={() => setInputMessage("What city services are available?")}
            className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 transition-colors"
          >
            City Services
          </button>
        </div>
      </div>
    </div>
  );
}
