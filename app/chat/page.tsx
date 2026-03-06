"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, Search, Clipboard, AlertTriangle, Camera, Send, Mic, Menu, X, MapPin, User } from "lucide-react";

// Message interface matching shared/types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentType?: 'safety_intel' | 'service_311' | 'web_scraper';
  timestamp: string;
  metadata?: {
    safetyScore?: 'A' | 'B' | 'C' | 'D' | 'F';
    mapCenter?: [number, number];
  };
}

// Quick action buttons
const quickActions = [
  { icon: Search, label: "Check Area Safety", id: "safety" },
  { icon: Clipboard, label: "Track 311 Request", id: "311" },
  { icon: AlertTriangle, label: "Find Emergency Help", id: "emergency" },
  { icon: Camera, label: "Report with Photo", id: "report", href: "/report" },
];

// Agent type colors
const agentTypeColors = {
  safety_intel: "bg-blue-100 text-blue-800",
  service_311: "bg-green-100 text-green-800", 
  web_scraper: "bg-purple-100 text-purple-800",
};

// Safety score colors
const safetyScoreColors = {
  A: "bg-green-100 text-green-800 border-green-200",
  B: "bg-green-50 text-green-700 border-green-200",
  C: "bg-yellow-100 text-yellow-800 border-yellow-200",
  D: "bg-orange-100 text-orange-800 border-orange-200",
  F: "bg-red-100 text-red-800 border-red-200",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"EN" | "ES" | "VI">("EN");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // API call to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          history: messages,
          language: language.toLowerCase(),
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const assistantMessage: Message = await response.json();
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Fallback response for demo
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about: "${input}". This is a demo response. The actual AI integration will be available once the backend is deployed.`,
        agentType: 'safety_intel',
        timestamp: new Date().toISOString(),
        metadata: {
          safetyScore: 'B',
        },
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlaceholder = () => {
    switch (language) {
      case 'ES': return "Pregunte sobre seguridad, encuentre servicios, reporte problemas...";
      case 'VI': return "Hỏi về an toàn, tìm dịch vụ, báo cáo sự cố...";
      default: return "Ask about safety, find services, report issues...";
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Montgomery Guardian</h1>
                <p className="text-xs text-gray-500">Safety Companion</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex-1 p-4 space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    if (action.href) {
                      window.location.href = action.href;
                    } else {
                      setInput(action.label);
                      setSidebarOpen(false);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Icon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">{action.label}</span>
                </button>
              );
            })}
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Guest User</p>
                <p className="text-xs text-gray-500">Sign in required</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900">Montgomery Guardian</h1>
          <div className="w-9" /> {/* Spacer for balance */}
        </div>

        {/* Mobile Quick Actions */}
        <div className="lg:hidden px-4 py-3 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    if (action.href) {
                      window.location.href = action.href;
                    } else {
                      setInput(action.label);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full whitespace-nowrap text-sm"
                >
                  <Icon className="w-4 h-4" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            // Empty State
            <div className="h-full flex items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome to Montgomery Guardian
                </h2>
                <p className="text-gray-600 mb-6">
                  Your AI safety companion for Montgomery. Ask about safety, find services, or report issues.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <img 
                    src="/api/placeholder/400/200" 
                    alt="Montgomery City Skyline"
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                  <p className="text-sm text-gray-600">Montgomery City Skyline</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.slice(0, 3).map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => setInput(action.label)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-2xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                    {/* Agent Type Badge */}
                    {message.role === 'assistant' && message.agentType && (
                      <div className="mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${agentTypeColors[message.agentType]}`}>
                          {message.agentType === 'safety_intel' && 'Safety Intel'}
                          {message.agentType === 'service_311' && '311 Service'}
                          {message.agentType === 'web_scraper' && 'Web Data'}
                        </span>
                      </div>
                    )}

                    {/* Safety Score Badge */}
                    {message.metadata?.safetyScore && (
                      <div className="mb-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${safetyScoreColors[message.metadata.safetyScore]}`}>
                          Safety Score: {message.metadata.safetyScore}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Map Placeholder */}
                    {message.metadata?.mapCenter && (
                      <div className="mt-2 bg-gray-200 rounded-lg p-4 flex items-center justify-center" style={{ width: '200px', height: '120px' }}>
                        <div className="text-center">
                          <MapPin className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                          <p className="text-xs text-gray-600">📍 Map view</p>
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          {/* Language Selector */}
          <div className="flex gap-2 mb-3">
            {(['EN', 'ES', 'VI'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  language === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={getPlaceholder()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="lg:hidden p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              className="hidden lg:flex p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={() => {
              window.location.href = '/report';
            }}
          />
        </div>
      </main>
    </div>
  );
}
