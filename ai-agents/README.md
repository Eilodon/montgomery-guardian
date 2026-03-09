# Montgomery Guardian AI Agents

AI agents service for Montgomery Guardian public safety platform, powered by Google Gemini and Genkit.

## Features

- **Intelligent Routing**: Automatically routes queries to appropriate specialized agents
- **Safety Intelligence Agent**: Handles crime data, safety assessments, and emergency information
- **311 Service Agent**: Manages city service requests and municipal services
- **Web Scraper Agent**: Provides real-time news and city updates
- **Vision Analysis Agent**: Analyzes images for city maintenance issues
- **Multi-language Support**: English, Spanish, Vietnamese translation
- **Tool Integration**: Seamless integration with backend APIs
- **Graceful Fallbacks**: Mock data when external services unavailable

## Quick Start

### Prerequisites

- Node.js 18+
- Google Gemini API key
- Backend API service running (for tool integration)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build and run:
```bash
npm run build
npm start
```

For development:
```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

### Chat - Main Orchestrator
```
POST /chat
Content-Type: application/json

{
  "message": "Is downtown safe at night?",
  "language": "en",
  "history": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ],
  "userLocation": {
    "lat": 32.3617,
    "lng": -86.2792
  },
  "context": {}
}
```

### Vision Analysis
```
POST /vision/analyze
Content-Type: application/json

{
  "imageBase64": "base64-encoded-image-data",
  "mimeType": "image/jpeg",
  "lat": 32.3617,
  "lng": -86.2792
}
```

## Agent Types

### Safety Intelligence Agent
Handles queries about:
- Crime statistics and trends
- Safety assessments for areas
- Emergency information
- Police patrols and activities
- Dangerous areas and warnings

**Example queries:**
- "Is downtown safe at night?"
- "What's the crime rate in Oak Park?"
- "Are there any police patrols in my area?"

### 311 Service Agent
Handles queries about:
- Potholes and road repair
- Graffiti removal
- Trash collection issues
- Flooding and drainage
- Overgrown vegetation
- Service request status

**Example queries:**
- "Where can I report a pothole?"
- "How do I check my 311 request status?"
- "What's the timeline for graffiti removal?"

### Web Scraper Agent
Handles queries about:
- Current news and events
- Road closures and traffic updates
- City announcements
- Emergency situations
- Weather-related impacts

**Example queries:**
- "Are there any road closures today?"
- "What's happening in Montgomery news?"
- "Any emergency situations right now?"

### Vision Analysis Agent
Analyzes images for:
- Potholes and road damage
- Graffiti and vandalism
- Trash accumulation
- Flooding and drainage issues
- Overgrown vegetation
- Other city maintenance problems

**Response format:**
```json
{
  "incidentType": "pothole",
  "severity": "medium",
  "confidence": 0.85,
  "description": "Large pothole detected in road surface...",
  "prefilledForm": {
    "serviceType": "pothole",
    "description": "Detailed description for 311 form",
    "suggestedPriority": "High"
  }
}
```

## Architecture

### Directory Structure

```
ai-agents/
├── src/
│   ├── index.ts              # Express server entrypoint
│   ├── agents/               # Specialized AI agents
│   │   ├── orchestrator.ts   # Main routing logic
│   │   ├── safety_agent.ts   # Safety intelligence
│   │   ├── agent_311.ts      # 311 services
│   │   ├── web_agent.ts      # Web scraping
│   │   └── vision_agent.ts  # Image analysis
│   ├── tools/               # API integration tools
│   │   ├── crime_tool.ts     # Crime data queries
│   │   ├── requests_tool.ts  # 311 request queries
│   │   └── scrape_tool.ts    # Web data queries
│   └── tests/               # Test suite
│       └── test_agents.test.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Data Flow

1. **Request Reception**: Express server receives HTTP requests
2. **Intent Classification**: Orchestrator determines which agent should handle the query
3. **Agent Processing**: Specialized agent processes the request using:
   - Google Gemini for AI reasoning
   - Backend API tools for real data
   - Context and history for continuity
4. **Response Generation**: Agent formulates response with relevant data
5. **Translation**: Optional translation to Spanish/Vietnamese
6. **Response Delivery**: Structured JSON response with metadata

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `ALLOWED_ORIGINS` | CORS origins | localhost:3000,localhost:8000 |
| `BACKEND_API_URL` | Backend API URL | http://localhost:8000 |
| `LOG_LEVEL` | Logging level | info |

### API Keys

You need a Google Gemini API key:
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Add it to your `.env` file: `GEMINI_API_KEY=your_key_here`

## Testing

Run the test suite:

```bash
# Install test dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Quality Gates

The service passes these quality checks:

- ✅ `/health` responds in < 100ms
- ✅ POST `/chat` with safety query → `agentType: 'safety_intel'`
- ✅ POST `/chat` with 311 query → `agentType: 'service_311'`
- ✅ POST `/vision/analyze` with pothole image → `incidentType: 'pothole'`, confidence > 0.7
- ✅ Language translation works (Spanish, Vietnamese)
- ✅ No hardcoded API keys (reads from env vars)
- ✅ Graceful error handling (no crashes)
- ✅ Comprehensive test coverage

## Development

### Running Locally

```bash
# Development with hot reload
npm run dev

# Production build and run
npm run build
npm start
```

### Testing Individual Components

```bash
# Test orchestrator
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Is downtown safe at night?"}'

# Test vision analysis
curl -X POST http://localhost:3001/vision/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"base64data","mimeType":"image/jpeg"}'
```

### Adding New Agents

1. Create new agent file in `src/agents/`
2. Export agent function with signature: `async function agentName(ai: any, input: any): Promise<any>`
3. Add routing logic in `orchestrator.ts`
4. Add corresponding tests
5. Update documentation

### Adding New Tools

1. Create tool file in `src/tools/`
2. Export function with proper error handling and fallback data
3. Import and use in relevant agents
4. Add tests for tool functionality

## Error Handling

The service implements comprehensive error handling:

- **API Failures**: Graceful fallback to mock data
- **Invalid Input**: Proper validation and error messages
- **Network Issues**: Timeout handling and retry logic
- **AI Service Errors**: Fallback responses without crashing
- **Missing Configuration**: Clear error messages for missing env vars

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Setup

1. Set production environment variables
2. Configure CORS origins for your domain
3. Set up monitoring and logging
4. Configure rate limiting if needed
5. Set up proper API key management

## Monitoring

The service includes:
- Request/response logging
- Error tracking and logging
- Performance metrics (response times)
- Health check endpoint for load balancers

## License

© 2024 Montgomery Guardian Project
