// components/chat/enhanced-chat.tsx
"use client";

import { useState, useRef, memo, useEffect, useCallback } from "react";
import {
  Send, Bot, User, Shield, Wrench,
  Camera, Globe, Loader2, AlertTriangle,
} from "lucide-react";
import type { AgentMessage } from "@/shared/types";

// ─── Types ─────────────────────────────────────────────────────────────────

interface EnhancedChatProps {
  className?: string;
  onMessageSend?: (message: string, imageData?: string) => void;
  messages?: AgentMessage[];
  isLoading?: boolean;
  agentType?: "safety_intel" | "service_311" | "vision" | "web_scraper" | "general";
}

// ─── Config ─────────────────────────────────────────────────────────────────

const AGENT_CONFIG = {
  safety_intel: {
    name: "Safety Intelligence",
    icon: Shield,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
    description: "Crime data and safety analysis",
  },
  service_311: {
    name: "311 Services",
    icon: Wrench,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500",
    description: "City services and requests",
  },
  vision: {
    name: "Vision AI",
    icon: Camera,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500",
    description: "Image analysis and reporting",
  },
  web_scraper: {
    name: "Web Intelligence",
    icon: Globe,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
    description: "Real-time news and updates",
  },
  general: {
    name: "General Assistant",
    icon: Bot,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500",
    description: "General information and help",
  },
} as const;

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * MessageList — isolated từ ChatInput để typing không trigger re-render list.
 * React.memo so sánh shallow — messages array thay đổi length/ref mới render.
 */
const MessageList = memo(function MessageList({
  messages,
  currentAgent,
  isLoading,
}: {
  messages: AgentMessage[];
  currentAgent: (typeof AGENT_CONFIG)[keyof typeof AGENT_CONFIG];
  isLoading: boolean;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const getConfidenceColor = (c: number) =>
    c >= 0.8 ? "text-green-500" : c >= 0.6 ? "text-yellow-500" : "text-red-500";

  const getConfidenceLabel = (c: number) =>
    c >= 0.8 ? "High" : c >= 0.6 ? "Medium" : "Low";

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center py-8">
          <div className={`inline-flex p-4 rounded-full ${currentAgent.bgColor} mb-4`}>
            <currentAgent.icon className={`w-8 h-8 ${currentAgent.color}`} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Welcome to {currentAgent.name}
          </h3>
          <p className="text-slate-400 max-w-md mx-auto">{currentAgent.description}</p>
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
                className={`rounded-lg p-3 ${message.role === "user"
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
  );
});

/**
 * ChatInput — owns `text` state locally.
 * EnhancedChat KHÔNG re-render khi user gõ phím.
 */
function ChatInput({
  onSend,
  currentAgent,
  isLoading,
}: {
  onSend: (text: string) => void;
  currentAgent: (typeof AGENT_CONFIG)[keyof typeof AGENT_CONFIG];
  isLoading: boolean;
}) {
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !selectedImage) return;
    onSend(trimmed);
    setText("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [text, selectedImage, onSend]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const quickActions = [
    { label: "Crime Rate", text: "What's the crime rate in my area?" },
    { label: "Report Issue", text: "How do I report a pothole?" },
    { label: "Safety Alerts", text: "Any current safety alerts?" },
    { label: "City Services", text: "What city services are available?" },
  ];

  return (
    <div className="border-t border-slate-700 p-4">
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          aria-label="Upload image file"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`p-2 rounded-lg ${currentAgent.bgColor} border ${currentAgent.borderColor} transition-colors`}
          title="Upload image"
        >
          <Camera className="w-5 h-5 text-slate-300" />
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`Ask ${currentAgent.name}...`}
            className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!text.trim() && !selectedImage}
          className={`px-4 py-3 rounded-lg font-medium transition-colors ${text.trim() || selectedImage
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

      <div className="flex gap-2 mt-2 flex-wrap">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => setText(qa.text)}
            className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 transition-colors"
          >
            {qa.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function EnhancedChat({
  className = "",
  onMessageSend,
  messages = [],
  isLoading = false,
  agentType = "general",
}: EnhancedChatProps) {
  const [showAgentInfo, setShowAgentInfo] = useState(false);
  const currentAgent = AGENT_CONFIG[agentType];

  const handleSend = useCallback(
    (text: string) => {
      onMessageSend?.(text);
    },
    [onMessageSend]
  );

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
          aria-label="Toggle agent info"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      </div>

      {/* Agent Info Panel */}
      {showAgentInfo && (
        <div className={`p-3 border-b ${currentAgent.bgColor}`}>
          <p className="text-sm text-slate-300">
            <strong>Agent:</strong> {currentAgent.name} — {currentAgent.description}
          </p>
        </div>
      )}

      {/* Render stream bị cắt đứt: typing trong ChatInput không touch MessageList */}
      <MessageList
        messages={messages}
        currentAgent={currentAgent}
        isLoading={isLoading}
      />

      <ChatInput
        onSend={handleSend}
        currentAgent={currentAgent}
        isLoading={isLoading}
      />
    </div>
  );
}
