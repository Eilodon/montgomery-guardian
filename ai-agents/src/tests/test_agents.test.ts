// ai-agents/src/tests/test_agents.test.ts
import axios from 'axios';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

describe('AI Agents Service', () => {
  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
      expect(response.data).toHaveProperty('service', 'ai-agents');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('version');
    });
  });

  describe('Chat Endpoint', () => {
    test('should handle safety intelligence query', async () => {
      const response = await axios.post(`${BASE_URL}/chat`, {
        message: "Is downtown safe at night?",
        language: 'en',
        history: [],
        userLocation: { lat: 32.3617, lng: -86.2792 }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('agentType', 'safety_intel');
      expect(response.data).toHaveProperty('timestamp');
      expect(typeof response.data.content).toBe('string');
      expect(response.data.content.length).toBeGreaterThan(0);
    });

    test('should handle 311 service query', async () => {
      const response = await axios.post(`${BASE_URL}/chat`, {
        message: "Where can I report a pothole?",
        language: 'en',
        history: []
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('agentType', 'service_311');
      expect(response.data).toHaveProperty('timestamp');
    });

    test('should handle web scraping query', async () => {
      const response = await axios.post(`${BASE_URL}/chat`, {
        message: "Are there any road closures today?",
        language: 'en',
        history: []
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('agentType');
      expect(response.data).toHaveProperty('timestamp');
    });

    test('should handle language translation', async () => {
      const response = await axios.post(`${BASE_URL}/chat`, {
        message: "Is downtown safe at night?",
        language: 'es',
        history: []
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('agentType');
      expect(response.data).toHaveProperty('timestamp');
      // Content should be in Spanish (though we can't easily verify this in tests)
    });

    test('should handle conversation history', async () => {
      const response = await axios.post(`${BASE_URL}/chat`, {
        message: "Can you tell me more about that?",
        language: 'en',
        history: [
          { role: 'user', content: 'What is the crime rate in Downtown?' },
          { role: 'assistant', content: 'Downtown has moderate crime levels...' }
        ]
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('agentType');
      expect(response.data).toHaveProperty('timestamp');
    });

    test('should handle errors gracefully', async () => {
      // Test with malformed request
      try {
        await axios.post(`${BASE_URL}/chat`, {
          message: "",
          language: 'invalid_lang'
        });
      } catch (error: any) {
        expect(error.response.status).toBeLessThan(500);
        expect(error.response.data).toHaveProperty('error');
      }
    });
  });

  describe('Vision Analysis Endpoint', () => {
    test('should analyze image for pothole', async () => {
      // Create a simple test image (base64 encoded 1x1 pixel red image)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const response = await axios.post(`${BASE_URL}/vision/analyze`, {
        imageBase64: testImageBase64,
        mimeType: 'image/png',
        lat: 32.3617,
        lng: -86.2792
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('incidentType');
      expect(response.data).toHaveProperty('severity');
      expect(response.data).toHaveProperty('confidence');
      expect(response.data).toHaveProperty('description');
      expect(response.data).toHaveProperty('prefilledForm');
      
      expect(['pothole', 'graffiti', 'trash', 'flooding', 'overgrown_grass', 'other']).toContain(response.data.incidentType);
      expect(['high', 'medium', 'low']).toContain(response.data.severity);
      expect(response.data.confidence).toBeGreaterThanOrEqual(0);
      expect(response.data.confidence).toBeLessThanOrEqual(1);
    });

    test('should handle missing image data', async () => {
      try {
        await axios.post(`${BASE_URL}/vision/analyze`, {
          mimeType: 'image/jpeg'
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should handle invalid image format', async () => {
      try {
        await axios.post(`${BASE_URL}/vision/analyze`, {
          imageBase64: 'invalid_base64',
          mimeType: 'image/jpeg'
        });
      } catch (error: any) {
        expect(error.response.status).toBe(500);
      }
    });

    test('should work without location data', async () => {
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const response = await axios.post(`${BASE_URL}/vision/analyze`, {
        imageBase64: testImageBase64,
        mimeType: 'image/png'
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('incidentType');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for invalid endpoints', async () => {
      try {
        await axios.get(`${BASE_URL}/invalid-endpoint`);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data).toHaveProperty('availableEndpoints');
      }
    });

    test('should handle malformed JSON', async () => {
      try {
        await axios.post(`${BASE_URL}/chat`, "invalid json", {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('Quality Gates', () => {
    test('health endpoint should respond quickly', async () => {
      const start = Date.now();
      await axios.get(`${BASE_URL}/health`);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should respond in under 100ms
    });

    test('chat endpoint should handle safety query correctly', async () => {
      const response = await axios.post(`${BASE_URL}/chat`, {
        message: "Is downtown safe at night?"
      });

      expect(response.status).toBe(200);
      expect(response.data.agentType).toBe('safety_intel');
    });

    test('chat endpoint should handle 311 query correctly', async () => {
      const response = await axios.post(`${BASE_URL}/chat`, {
        message: "Where can I report a pothole?"
      });

      expect(response.status).toBe(200);
      expect(response.data.agentType).toBe('service_311');
    });

    test('vision analysis should detect pothole with confidence', async () => {
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const response = await axios.post(`${BASE_URL}/vision/analyze`, {
        imageBase64: testImageBase64,
        mimeType: 'image/png'
      });

      expect(response.status).toBe(200);
      expect(response.data.confidence).toBeGreaterThan(0);
    });
  });
});
