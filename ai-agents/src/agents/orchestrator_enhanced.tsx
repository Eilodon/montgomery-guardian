// ai-agents/src/agents/orchestrator_enhanced.tsx
// Enhanced orchestrator with direct Gemini tool-calling

import GoogleGenerativeAI from "google-generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Agent function definitions
const AGENT_FUNCTIONS = {
  safety_intel: {
    description: "Handles crime data queries, safety assessments, and emergency information",
    examples: [
      "Is downtown safe at night?",
      "What's the crime rate in Oak Park?",
      "Are there any police patrols in my area?"
    ]
  },
  service_311: {
    description: "Handles 311 service requests, municipal services, and city information",
    examples: [
      "Where can I report a pothole?",
      "What's my 311 request status?",
      "How do I check my 311 request status?"
    ]
  },
  vision: {
    description: "Analyzes images for city maintenance issues and auto-fills 311 forms",
    examples: [
      "Analyze this photo of a pothole",
      "What kind of issue is in this image?",
      "Auto-fill a 311 report from this picture"
    ]
  },
  web_scraper: {
    description: "Provides real-time news and city updates from web sources",
    examples: [
      "Any breaking news today?",
      "Are there road closures?",
      "What's happening in Montgomery news?"
    ]
  }
};

export interface AgentOrchestrationRequest {
  message: string;
  language?: "en" | "es" | "vi";
  history?: Array<{ role: string; content: string; timestamp: string }>;
  userLocation?: { lat: number; lng: number };
  context?: Record<string, any>;
}

export interface AgentOrchestrationResponse {
  agentType: "safety_intel" | "service_311" | "vision" | "web_scraper" | "general";
  response: string;
  confidence: number;
  metadata?: {
    safetyScore?: string;
    mapCenter?: [number, number];
    incidents?: any[];
    requests311?: any[];
    webData?: any[];
  };
}

export class AgentOrchestrator {
  private model: any;
  private tools: Record<string, Function>;

  constructor() {
    this.model = model;
    this.tools = {
      get_crime_data: this.getCrimeData.bind(this),
      get_311_data: this.get311Data.bind(this),
      scrape_web_content: this.scrapeWebContent.bind(this),
      analyze_image: this.analyzeImage.bind(this),
    };
  }

  async orchestrate(request: AgentOrchestrationRequest): Promise<AgentOrchestrationResponse> {
    try {
      // Classify intent and select agent
      const { agentType, confidence } = await this.classifyIntent(request.message);
      
      console.log(`Orchestrator routing to ${agentType} agent with confidence ${confidence}`);
      
      // Route to appropriate agent
      let response: AgentOrchestrationResponse;
      
      switch (agentType) {
        case "safety_intel":
          response = await this.handleSafetyIntel(request);
          break;
        case "service_311":
          response = await this.handleService311(request);
          break;
        case "vision":
          response = await this.handleVision(request);
          break;
        case "web_scraper":
          response = await this.handleWebScraper(request);
          break;
        default:
          response = await this.handleGeneral(request);
      }

      // Apply translation if needed
      if (request.language && request.language !== "en") {
        response.response = await this.translate(response.response, request.language);
      }

      return response;
      
    } catch (error) {
      console.error("Orchestration error:", error);
      return {
        agentType: "general",
        response: "I'm having trouble processing your request right now. Please try again or contact support.",
        confidence: 0.1,
      };
    }
  }

  private async classifyIntent(message: string): Promise<{ agentType: string; confidence: number }> {
    const prompt = `Classify the user's intent into one of these categories:
    
    Categories:
    - safety_intel: Questions about crime, safety, police, emergency situations
    - service_311: Questions about 311 services, city permits, municipal requests
    - vision: Image analysis requests, photo uploads, visual content
    - web_scraper: Questions about news, current events, web content
    - general: General conversation, greetings, other topics

User message: "${message}"

Respond with JSON only:
{
  "agentType": "category_name",
  "confidence": 0.0-1.0
}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseFormat: "json",
        temperature: 0.1,
      },
    });

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return { agentType: "general", confidence: 0.5 };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        agentType: parsed.agentType,
        confidence: parsed.confidence || 0.5
      };
    } catch (error) {
      console.error("Failed to parse intent classification:", error);
      return { agentType: "general", confidence: 0.5 };
    }
  }

  private async handleSafetyIntel(request: AgentOrchestrationRequest): Promise<AgentOrchestrationResponse> {
    const prompt = `You are a Montgomery city safety intelligence assistant. Answer the user's question about safety and crime.

User message: "${request.message}"
Location: ${request.userLocation ? `${request.userLocation.lat}, ${request.userLocation.lng}` : 'Not provided'}
History: ${JSON.stringify(request.history || [])}

Use the available tools to provide accurate, helpful responses. Focus on:
- Crime statistics and trends
- Safety assessments for specific areas
- Emergency information and procedures
- Police presence and activities
- Dangerous areas and warnings

Be concise but thorough. If you don't have specific data, provide general safety guidance.`;

    const tools = [
      {
        functionDeclarations: [
          {
            name: "get_crime_data",
            description: "Get crime data from backend API",
            parameters: {
              properties: {
                location: { type: "object", description: "User location coordinates" },
                timeRange: { type: "string", description: "Time range filter" }
              }
            }
          }
        ]
      }
    ];

    const result = await model.generateContent({
      contents: [
        { role: "system", parts: [{ text: prompt }] },
        { role: "user", parts: [{ text: JSON.stringify(tools) }] }
      ],
      tools: tools,
    });

    const response = result.response.text();
    
    return {
      agentType: "safety_intel",
      response: response.trim(),
      confidence: 0.85,
      metadata: {
        safetyScore: this.calculateSafetyScore(request),
        mapCenter: request.userLocation ? [request.userLocation.lng, request.userLocation.lat] : undefined,
      }
    };
  }

  private async handleService311(request: AgentOrchestrationRequest): Promise<AgentOrchestrationResponse> {
    const prompt = `You are a Montgomery 311 service assistant. Help the user with city services and municipal requests.

User message: "${request.message}"
Location: ${request.userLocation ? `${request.userLocation.lat}, ${request.userLocation.lng}` : 'Not provided'}
History: ${JSON.stringify(request.history || [])}

Use the available tools to provide accurate, helpful responses. Focus on:
- 311 service requests and procedures
- Service request status tracking
- City permits and regulations
- Municipal services and departments
- Service request submission guidance

Be helpful and actionable. If you don't have specific data, provide general 311 guidance.`;

    const tools = [
      {
        functionDeclarations: [
          {
            name: "get_311_data",
            description: "Get 311 service request data from backend API",
            parameters: {
              properties: {
                location: { type: "object", description: "User location coordinates" },
                status: { type: "string", description: "Filter by status" },
                serviceType: { type: "string", description: "Filter by service type" }
              }
            }
          }
        ]
      }
    ];

    const result = await model.generateContent({
      contents: [
        { role: "system", parts: [{ text: prompt }] },
        { role: "user", parts: [{ text: JSON.stringify(tools) }] }
      ],
      tools: tools,
    });

    const response = result.response.text();
    
    return {
      agentType: "service_311",
      response: response.trim(),
      confidence: 0.85,
      metadata: {
        requests311: [], // Would be populated by tool calls
      }
    };
  }

  private async handleVision(request: AgentOrchestrationRequest): Promise<AgentOrchestrationResponse> {
    // For vision requests, we need image data
    const hasImage = request.context && request.context.imageData;
    
    if (!hasImage) {
      return {
        agentType: "vision",
        response: "I can analyze images for city maintenance issues. Please upload a photo and I'll help identify the problem and auto-fill a 311 report.",
        confidence: 0.9,
      };
    }

    const prompt = `Analyze this image for city maintenance issues in Montgomery, Alabama.

User message: "${request.message}"
Location: ${request.userLocation ? `${request.userLocation.lat}, ${request.userLocation.lng}` : 'Not provided'}
Image data: ${request.context.imageData.substring(0, 100)}...

Focus on identifying:
- Type of issue (pothole, graffiti, trash, flooding, etc.)
- Severity assessment (high, medium, low)
- Location details if visible
- Recommended actions

Provide a detailed analysis and suggest next steps.`;

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: request.context.imageData.split(',')[1] } }] }
      ],
    });

    const response = result.response.text();
    
    return {
      agentType: "vision",
      response: response.trim(),
      confidence: 0.9,
    };
  }

  private async handleWebScraper(request: AgentOrchestrationRequest): Promise<AgentOrchestrationResponse> {
    const prompt = `You are a Montgomery city information assistant. Provide current news and updates about the city.

User message: "${request.message}"
Location: ${request.userLocation ? `${request.userLocation.lat}, ${request.userLocation.lng}` : 'Not provided'}
History: ${JSON.stringify(request.history || [])}

Use the available tools to get current information about:
- Breaking news and events
- Road closures and traffic updates
- City announcements
- Emergency situations
- Weather-related impacts

Be timely and informative. If you don't have current data, provide general city information.`;

    const tools = [
      {
        functionDeclarations: [
          {
            name: "scrape_web_content",
            description: "Scrape web content for city information",
            parameters: {
              properties: {
                query: { type: "string", description: "Search query" },
                source: { type: "string", description: "Source to scrape" }
              }
            }
          }
        ]
      }
    ];

    const result = await model.generateContent({
      contents: [
        { role: "system", parts: [{ text: prompt }] },
        { role: "user", parts: [{ text: JSON.stringify(tools) }] }
      ],
      tools: tools,
    });

    const response = result.response.text();
    
    return {
      agentType: "web_scraper",
      response: response.trim(),
      confidence: 0.8,
      metadata: {
        webData: [], // Would be populated by tool calls
      }
    };
  }

  private async handleGeneral(request: AgentOrchestrationRequest): Promise<AgentOrchestrationResponse> {
    const prompt = `You are a helpful assistant for Montgomery Guardian, a public safety platform. Help the user with their question.

User message: "${request.message}"
Location: ${request.userLocation ? `${request.userLocation.lat}, ${request.userLocation.lng}` : 'Not provided'}
History: ${JSON.stringify(request.history || [])}

Provide helpful, relevant information about Montgomery city services, safety, or general assistance. If you can't help with the specific request, suggest contacting the appropriate city department.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    return {
      agentType: "general",
      response: result.response.text(),
      confidence: 0.7,
    };
  }

  private async translate(text: string, targetLanguage: string): Promise<string> {
    const translations = {
      es: {
        "I'm having trouble with": "Tengo problemas con",
        "How can I help you today?": "¿Cómo puedo ayudarte hoy?",
        "Montgomery Guardian": "Montgomery Guardian",
        "city safety platform": "plataforma de seguridad de la ciudad",
        "crime": "crimen",
        "safety": "seguridad",
        "emergency": "emergencia",
        "police": "policía",
        "311 service": "servicio 311"
      },
      vi: {
        "I'm having trouble with": "Tôi đang gặp vấn đề với",
        "How can I help you today?": "Làm thế nào tôi có thể giúp bạn hôm nay?",
        "Montgomery Guardian": "Montgomery Guardian",
        "city safety platform": "nền tảng an toàn của thành phố",
        "crime": "tội phạm",
        "safety": "an toàn",
        "emergency": "khẩn cấp",
        "police": "cảnh sát",
        "311 service": "dịch vụ 311"
      }
    };

    const targetTranslations = translations[targetLanguage] || {};
    
    let translatedText = text;
    for (const [english, translated] of Object.entries(targetTranslations)) {
      translatedText = translatedText.replace(new RegExp(english, 'gi'), translated);
    }

    return translatedText;
  }

  private calculateSafetyScore(request: AgentOrchestrationRequest): string {
    // Mock safety score calculation based on location and time
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 6;
    const isWeekend = [0, 6].includes(new Date().getDay());
    
    let score = "A"; // Default safe
    
    // Adjust based on factors
    if (isNight) score = "B";
    if (isWeekend) score = "B";
    
    // Location-based adjustments (simplified)
    if (request.userLocation) {
      const downtownDistance = Math.sqrt(
        Math.pow(request.userLocation.lat - 32.3617, 2) + 
        Math.pow(request.userLocation.lng - (-86.2792), 2)
      );
      
      if (downtownDistance < 0.05) score = "C";
      else if (downtownDistance < 0.1) score = "B";
    }
    
    return score;
  }

  // Tool implementations
  private async getCrimeData(params: any): Promise<any> {
    try {
      const response = await fetch("http://localhost:8000/api/v1/crime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch crime data");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Crime data tool error:", error);
      // Return mock data
      return {
        data: [
          {
            id: "crime_1",
            type: "violent",
            latitude: 32.3617,
            longitude: -86.2792,
            neighborhood: "Downtown",
            timestamp: new Date().toISOString(),
            status: "open",
            description: "Sample crime incident"
          }
        ]
      };
    }
  }

  private async get311Data(params: any): Promise<any> {
    try {
      const response = await fetch("http://localhost:8000/api/v1/requests-311", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch 311 data");
      }
      
      return await response.json();
    } catch (error) {
      console.error("311 data tool error:", error);
      // Return mock data
      return {
        data: [
          {
            requestId: "req_1",
            serviceType: "pothole",
            status: "open",
            latitude: 32.3617,
            longitude: -86.2792,
            address: "123 Dexter Ave",
            createdAt: new Date().toISOString(),
            description: "Sample 311 request"
          }
        ]
      };
    }
  }

  private async scrapeWebContent(params: any): Promise<any> {
    try {
      // This would integrate with Bright Data MCP
      // For now, return mock web data
      return {
        data: [
          {
            title: "Traffic Incident on Main St",
            description: "Multi-vehicle collision reported",
            timestamp: new Date().toISOString(),
            severity: "critical",
            source: "Montgomery Police"
          }
        ]
      };
    } catch (error) {
      console.error("Web scraping tool error:", error);
      return { data: [] };
    }
  }

  private async analyzeImage(params: any): Promise<any> {
    try {
      // This would call the vision agent
      const response = await fetch("http://localhost:3001/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error("Failed to analyze image");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Image analysis tool error:", error);
      return {
        result: {
          incidentType: "other",
          severity: "medium",
          confidence: 0.5,
          description: "Unable to analyze image due to technical issues."
        }
      };
    }
  }
}

// Export singleton instance
export const orchestrator = new AgentOrchestrator();
